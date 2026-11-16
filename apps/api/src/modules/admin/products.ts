import express from 'express';
import type { Database, SqlConnection } from '../../db.ts';
import { InputError } from '../../lib/errors.ts';
import { fields, id, integer } from '../orders/validation.ts';

type ProductRow = Record<string, unknown>;

function adminProduct(row: ProductRow) {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    unitPriceVnd: Number(row.unit_price_vnd),
    isActive: Boolean(row.is_active),
    version: Number(row.version),
    templateVersion: String(row.template_version)
  };
}

async function readProduct(connection: SqlConnection, productId: string) {
  const { rows } = await connection.query<ProductRow>(
    'SELECT id,name,description,unit_price_vnd,is_active,version,template_version FROM products WHERE id=?',
    [productId]
  );
  return rows[0];
}

export function adminProductsRouter(db: Database) {
  const router = express.Router();

  router.get('/admin/products', async (_req, res) => {
    const { rows } = await db.query<ProductRow>(
      'SELECT id,name,description,unit_price_vnd,is_active,version,template_version FROM products ORDER BY created_at,id'
    );
    res.json(rows.map(adminProduct));
  });

  router.patch('/admin/products/:id', async (req, res) => {
    const productId = id(req.params.id);
    const input = fields(req.body, [
      'expectedVersion',
      'name',
      'description',
      'unitPriceVnd',
      'isActive'
    ]);
    const keys = ['name', 'description', 'unitPriceVnd', 'isActive'] as const;
    if (!keys.some(key => Object.hasOwn(input, key)))
      throw new InputError('Cần ít nhất một trường cần cập nhật.', 'INVALID_PRODUCT_UPDATE', 422);
    const expectedVersion = integer(input.expectedVersion, 1, 2147483647);
    const name = Object.hasOwn(input, 'name')
      ? typeof input.name === 'string' &&
        input.name.trim().length > 0 &&
        input.name.trim().length <= 200
        ? input.name.trim()
        : (() => {
            throw new InputError('Tên sản phẩm cần từ 1 đến 200 ký tự.', 'INVALID_PRODUCT', 422);
          })()
      : undefined;
    const description = Object.hasOwn(input, 'description')
      ? typeof input.description === 'string' && input.description.length <= 5000
        ? input.description.trim()
        : (() => {
            throw new InputError('Mô tả tối đa 5.000 ký tự.', 'INVALID_PRODUCT', 422);
          })()
      : undefined;
    const unitPriceVnd = Object.hasOwn(input, 'unitPriceVnd')
      ? integer(input.unitPriceVnd, 1000, 10000000)
      : undefined;
    if (Object.hasOwn(input, 'isActive') && typeof input.isActive !== 'boolean')
      throw new InputError('Trạng thái sản phẩm không hợp lệ.', 'INVALID_PRODUCT', 422);
    const isActive = Object.hasOwn(input, 'isActive') ? (input.isActive as boolean) : undefined;

    const product = await db.transaction(async tx => {
      const current = (
        await tx.query<ProductRow>(
          'SELECT id,name,description,unit_price_vnd,is_active,version,template_version FROM products WHERE id=? FOR UPDATE',
          [productId]
        )
      ).rows[0];
      if (!current) throw new InputError('Không tìm thấy sản phẩm.', 'PRODUCT_NOT_FOUND', 404);
      if (Number(current.version) !== expectedVersion)
        throw new InputError(
          'Sản phẩm đã được thay đổi. Tải lại dữ liệu trước khi lưu.',
          'PRODUCT_VERSION_CONFLICT',
          409
        );

      const nextName = name ?? String(current.name);
      const nextDescription = description ?? String(current.description);
      const nextPrice = unitPriceVnd ?? Number(current.unit_price_vnd);
      const nextIsActive = isActive ?? Boolean(current.is_active);
      if (
        nextName === String(current.name) &&
        nextDescription === String(current.description) &&
        nextPrice === Number(current.unit_price_vnd) &&
        nextIsActive === Boolean(current.is_active)
      )
        return current;

      await tx.query(
        'UPDATE products SET name=?,description=?,unit_price_vnd=?,is_active=?,version=version+1 WHERE id=? AND version=?',
        [nextName, nextDescription, nextPrice, nextIsActive, productId, expectedVersion]
      );
      if (nextPrice !== Number(current.unit_price_vnd))
        await tx.query(
          'INSERT INTO product_price_history(product_id,old_price,new_price) VALUES(?,?,?)',
          [productId, current.unit_price_vnd, nextPrice]
        );
      return (await readProduct(tx, productId))!;
    });
    res.json(adminProduct(product));
  });

  return router;
}
