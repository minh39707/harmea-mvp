import { createHash, createHmac, randomUUID } from 'node:crypto';
import express from 'express';
import sharp from 'sharp';
import type { Database } from './db.ts';

class InputError extends Error { constructor(message: string, publicCode = 'VALIDATION_ERROR', statusCode = 422) { super(message); this.code = publicCode; this.status = statusCode; } code: string; status: number; }
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const hosts = new Set(['open.spotify.com','youtube.com','www.youtube.com','music.youtube.com','youtu.be','soundcloud.com','www.soundcloud.com']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new InputError('Dữ liệu không hợp lệ.'); return v as Record<string, unknown>; };
function text(v: unknown, label: string, max: number, required = true) { if (typeof v !== 'string') { if (!required && v == null) return ''; throw new InputError(`Kiểm tra ${label}.`); } const value=v.trim(); if ((required && !value) || value.length>max) throw new InputError(`${label}: tối đa ${max} ký tự, không được bỏ trống nếu bắt buộc.`); return value; }
function date(v: unknown, label: string) { const value=text(v,label,10,false); if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10)!==value)) throw new InputError(`${label} không hợp lệ.`); return value; }
export function commerceRouter(db: Database, secret: string) {
  const router = express.Router();
  const tokenFor=(id:string)=>createHmac('sha256',secret).update(`harmea-checkout:${id}`).digest('base64url');
  const receipt=(r:Record<string,unknown>, includeToken=false)=>({orderNumber:r.order_number,status:r.status,subtotalVnd:r.subtotal_vnd,shippingFeeVnd:null,isTest:true,createdAt:r.created_at,...(includeToken?{trackingToken:tokenFor(String(r.id))}:{})});
  router.get('/products/current',async(_req,res)=>{
    const {rows}=await db.query('SELECT id,name,unit_price_vnd,template_version,is_demo FROM products WHERE is_active=true');
    const p=rows[0]; if(!p){res.status(404).json({error:{code:'PRODUCT_NOT_FOUND',message:'Sản phẩm đang được cập nhật.'}});return;}
    res.json({id:p.id,name:'Harméa NFC Music Card',unitPriceVnd:p.unit_price_vnd,currency:'VND',templateVersion:p.template_version,isDemoPrice:p.is_demo,image:'/images/card-sample.png',cardSizeMm:{width:54,height:86}});
  });
  router.post('/demo-checkouts',async(req,res)=>{
    try {
      const body=object(req.body);
      const requestKey=text(body.requestKey,'mã yêu cầu',36); if(!uuid.test(requestKey)) throw new InputError('Mã yêu cầu không hợp lệ.');
      if(body.confirmed!==true) throw new InputError('Vui lòng xác nhận đây là đơn thử, không thu tiền.');
      if(!Array.isArray(body.items)||body.items.length<1||body.items.length>10)throw new InputError('Giỏ hàng cần từ 1 đến 10 thiết kế.');
      const c=object(body.recipient);
      const recipient={name:text(c.name,'tên người nhận',100),phone:text(c.phone,'số điện thoại',20),address:text(c.address,'địa chỉ',300),note:text(c.note,'ghi chú',500,false)};
      if(!/^(?:\+84|0)[0-9]{9}$/.test(recipient.phone.replace(/[\s.-]/g,'')))throw new InputError('Nhập số điện thoại Việt Nam hợp lệ.');
      const items: Array<{ productId: string; quantity: number; design: any }> = [];
      for(const raw of body.items){
        const item=object(raw), d=object(item.design);
        if(!Number.isInteger(item.quantity)||Number(item.quantity)<1||Number(item.quantity)>10)throw new InputError('Số lượng mỗi thiết kế từ 1 đến 10.');
        const design={fullName:text(d.fullName,'tên trên thẻ',60),signatureText:text(d.signatureText,'chữ ký',40,false),place:text(d.place,'địa điểm',80,false),dateOfBirth:date(d.dateOfBirth,'ngày sinh'),commemorativeDate:date(d.commemorativeDate,'ngày kỷ niệm'),musicUrl:text(d.musicUrl,'liên kết nhạc',2048),color:text(d.color,'màu thẻ',12),photo:text(d.photo,'ảnh',350000,false)};
        if(!['cream','blue','rose'].includes(design.color))throw new InputError('Màu thẻ không hợp lệ.');
        if(design.dateOfBirth && design.dateOfBirth>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date()))throw new InputError('Ngày sinh không được ở tương lai.');
        let u:URL;try{u=new URL(design.musicUrl);}catch{throw new InputError('Liên kết nhạc không hợp lệ.');}
        if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.has(u.hostname))throw new InputError('Dùng link HTTPS từ Spotify, YouTube hoặc SoundCloud.');
        if(design.photo){
          if(!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(design.photo))throw new InputError('Ảnh cần là JPEG hoặc PNG.');
          try{const image=sharp(Buffer.from(design.photo.split(',')[1]!, 'base64'),{limitInputPixels:20000000});const meta=await image.metadata();if(!meta.width||!meta.height||meta.width>8192||meta.height>8192)throw Error();design.photo='data:image/jpeg;base64,'+(await image.rotate().resize(600,600,{fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer()).toString('base64');}catch{throw new InputError('Không đọc được ảnh hoặc ảnh quá lớn.');}
        }
        items.push({productId:text(item.productId,'sản phẩm',36),quantity:Number(item.quantity),design});
      }
      const requestHash=hash(JSON.stringify({items,recipient}));
      const existing=await db.query('SELECT * FROM demo_checkouts WHERE request_key=$1',[requestKey]);
      if(existing.rows[0]){if(existing.rows[0].request_hash!==requestHash)throw new InputError('Yêu cầu đã được dùng với nội dung khác.','REQUEST_CONFLICT',409);res.json(receipt(existing.rows[0],true));return;}
      const result=await db.transaction(async tx=>{
        const {rows}=await tx.query('SELECT * FROM products WHERE is_active=true');const product=rows[0];
        if(!product||items.some(i=>i.productId!==product.id))throw new InputError('Sản phẩm không còn nhận đơn.');
        const snapshot=items.map(i=>({...i,productName:product.name,unitPriceVnd:Number(product.unit_price_vnd),templateVersion:product.template_version}));
        const subtotal=snapshot.reduce((n,i)=>n+i.quantity*i.unitPriceVnd,0);
        const id=randomUUID(),orderNumber='HM-'+id.replaceAll('-','').slice(0,12).toUpperCase();
        const inserted=await tx.query('INSERT INTO demo_checkouts(id,order_number,request_key,request_hash,tracking_hash,items,recipient,subtotal_vnd) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(request_key) DO NOTHING RETURNING *',[id,orderNumber,requestKey,requestHash,hash(tokenFor(id)),JSON.stringify(snapshot),JSON.stringify(recipient),subtotal]);
        if(inserted.rows[0])return inserted.rows[0];
        const replay=await tx.query('SELECT * FROM demo_checkouts WHERE request_key=$1',[requestKey]);if(!replay.rows[0]||replay.rows[0].request_hash!==requestHash)throw new InputError('Nội dung yêu cầu không khớp.','REQUEST_CONFLICT',409);return replay.rows[0];
      });
      res.status(201).json(receipt(result,true));
    }catch(error){if(error instanceof InputError){res.status(error.status).json({error:{code:error.code,message:error.message}});return;}throw error;}
  });
  router.post('/demo-tracking',async(req,res)=>{
    const token=req.body?.token;if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token)){res.status(404).json({error:{code:'NOT_FOUND',message:'Không tìm thấy đơn thử. Kiểm tra liên kết theo dõi.'}});return;}
    const {rows}=await db.query('SELECT order_number,status,subtotal_vnd,created_at FROM demo_checkouts WHERE tracking_hash=$1',[hash(token)]);
    if(!rows[0]){res.status(404).json({error:{code:'NOT_FOUND',message:'Không tìm thấy đơn thử. Kiểm tra liên kết theo dõi.'}});return;}
    res.json(receipt(rows[0]));
  });
  return router;
}
