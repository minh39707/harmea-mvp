import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './SignaturePad.css';
import { IconPen, IconClose, IconRefresh, IconCheck } from '../../shared/ui/Icons';

type SignaturePadProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  initialSignature?: string;
};

export default function SignaturePad({
  isOpen,
  onClose,
  onSave,
  initialSignature
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Close on Escape key & prevent background scroll
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Initialize canvas resolution & settings when opened
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 2;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#151816';

    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = initialSignature;
    } else {
      setHasDrawn(false);
    }
  }, [isOpen, initialSignature]);

  if (!isOpen) return null;

  function getCanvasCoords(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const coords = getCanvasCoords(e);
    lastPoint.current = coords;
    setIsDrawing(true);
    setHasDrawn(true);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, 1.75, 0, Math.PI * 2);
    ctx.fillStyle = '#151816';
    ctx.fill();
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || !lastPoint.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentCoords = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentCoords.x, currentCoords.y);
    ctx.stroke();

    lastPoint.current = currentCoords;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
    lastPoint.current = null;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    lastPoint.current = null;
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop to bounding box of drawn pixels with minimal padding for neat baseline
    const dpr = window.devicePixelRatio || 2;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let minX = canvas.width,
      minY = canvas.height,
      maxX = 0,
      maxY = 0;
    let found = false;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha && alpha > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found) {
      onSave('');
      onClose();
      return;
    }

    // Add minimal padding so stroke edges aren't clipped, keeping baseline flush
    const padding = Math.round(2 * dpr);
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width, maxX + padding);
    maxY = Math.min(canvas.height, maxY + padding);

    const cropWidth = maxX - minX;
    const cropHeight = maxY - minY;

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = cropWidth;
    trimmedCanvas.height = cropHeight;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (trimmedCtx) {
      trimmedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      onSave(trimmedCanvas.toDataURL('image/png'));
    } else {
      onSave(canvas.toDataURL('image/png'));
    }

    onClose();
  }

  return createPortal(
    <div
      className="signature-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-dialog-title"
    >
      <div className="signature-modal-card" onClick={e => e.stopPropagation()}>
        {/* Header với label bảng ghi và nút đóng X */}
        <div className="signature-modal-header">
          <h3 id="signature-dialog-title">
            <IconPen size={18} color="var(--brand)" />
            <span>Bảng ghi chữ ký tay</span>
          </h3>
          <button
            type="button"
            className="signature-close-btn"
            onClick={onClose}
            aria-label="Đóng bảng ghi chữ ký"
            title="Đóng (Esc)"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Khung vẽ chữ ký */}
        <div className="signature-canvas-wrapper">
          <canvas
            ref={canvasRef}
            className="signature-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          <div className="signature-canvas-guide" aria-hidden="true" />
          {!hasDrawn && (
            <div className="signature-canvas-placeholder" aria-hidden="true">
              <IconPen size={26} color="#8c8c84" />
              <span>Dùng ngón tay hoặc chuột để viết chữ ký tại đây</span>
            </div>
          )}
        </div>

        {/* Nút Vẽ lại và Xác nhận theo yêu cầu người dùng */}
        <div className="signature-modal-actions">
          <button
            type="button"
            className="signature-btn clear"
            onClick={handleClear}
            disabled={!hasDrawn}
            title="Xóa nét vẽ để ký lại"
          >
            <IconRefresh size={15} />
            <span>Vẽ lại</span>
          </button>

          <button
            type="button"
            className="signature-btn primary"
            onClick={handleSave}
            disabled={!hasDrawn}
            title="Xác nhận chữ ký và áp dụng vào thẻ"
          >
            <IconCheck size={16} strokeWidth={2.5} />
            <span>Xác nhận</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
