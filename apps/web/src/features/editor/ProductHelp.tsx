export default function ProductHelp() {
  return (
    <>
      <section id="how" className="how">
        <h2>Cách sử dụng</h2>
        <div className="how-steps">
          <article>
            <span>01</span>
            <h3>Chọn một giai điệu</h3>
            <p>Chọn liên kết Spotify, YouTube hoặc SoundCloud bạn muốn lưu.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Biến nó thành của bạn</h3>
            <p>Thêm ảnh và thông tin, kiểm tra preview rồi gửi thiết kế.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Chạm để mở liên kết</h3>
            <p>Điện thoại có NFC mở liên kết; nghe nhạc cần Internet và ứng dụng phù hợp.</p>
          </article>
        </div>
      </section>
      <section className="faq">
        <h2>Câu hỏi thường gặp</h2>
        <div>
          <details>
            <summary>
              Thẻ có tự phát nhạc không?<span>+</span>
            </summary>
            <p>
              Không. NFC mở một liên kết; bạn nghe nhạc trên Spotify, YouTube hoặc SoundCloud. Khả
              năng mở app và phát nhạc phụ thuộc thiết bị, tài khoản và kết nối Internet.
            </p>
          </details>
          <details>
            <summary>
              Có thể thay đổi bài hát sau này không?<span>+</span>
            </summary>
            <p>
              Khả năng ghi lại URL phụ thuộc thẻ NFC và việc khóa ghi. Nội dung ảnh/chữ đã in không
              thay đổi.
            </p>
          </details>
          <details>
            <summary>
              Đơn thử này có được giao không?<span>+</span>
            </summary>
            <p>
              Đơn được lưu để kiểm tra quy trình; sản xuất và giao hàng cần cửa hàng xác nhận riêng.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
