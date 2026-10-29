export default function ProductHelp() {
  return (
    <>
      <section id="how" className="how">
        <div>
          <p className="eyebrow">NHỎ GỌN, NHƯNG ĐẦY Ý NGHĨA</p>
          <h2>
            Kỷ niệm có một
            <br />
            <em>cách chạm rất riêng.</em>
          </h2>
        </div>
        <article>
          <span>01</span>
          <h3>Chọn một giai điệu</h3>
          <p>Bài hát đầu tiên, playlist đi cùng nhau, hay một điều bạn chưa nói thành lời.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Biến nó thành của bạn</h3>
          <p>Thêm ảnh và thông tin cá nhân. Giữ lại một phiên bản rất riêng của kỷ niệm.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Chạm để mở liên kết</h3>
          <p>
            Điện thoại có NFC mở URL đã ghi trên thẻ. Phát nhạc cần Internet và ứng dụng phù hợp.
          </p>
        </article>
      </section>
      <section className="faq">
        <div>
          <p className="eyebrow">TRƯỚC KHI BẠN CHỌN</p>
          <h2>
            Một vài điều
            <br />
            bạn muốn biết.
          </h2>
        </div>
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
              Theo thử nghiệm trên thẻ mẫu của nhóm, URL có thể ghi lại bằng NFC Tools. Việc này
              không thay đổi ảnh và chữ đã in trên thẻ.
            </p>
          </details>
          <details>
            <summary>
              Đơn thử này có được giao không?<span>+</span>
            </summary>
            <p>
              Đây là bản demo để kiểm tra quy trình. Đơn được lưu nhưng không thu tiền và không tự
              động chuyển sang sản xuất hoặc giao hàng. Giá, phí ship và thiết kế cần được cửa hàng
              xác nhận riêng.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
