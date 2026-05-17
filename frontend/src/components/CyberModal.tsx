import Modal from 'react-bootstrap/Modal';
import { Button } from './ui/Button';

type CyberModalProps = {
  show: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onHide: () => void;
  loading?: boolean;
};

export function CyberModal({
  show,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onHide,
  loading = false,
}: CyberModalProps) {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" className="cyber-modal">
      <Modal.Header closeButton className="border-neon-cyan/10">
        <Modal.Title className="font-display text-white">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-slate-300">{children}</Modal.Body>
      <Modal.Footer className="gap-2 border-neon-cyan/10">
        <button type="button" className="btn-ghost rounded-lg px-4 py-2" onClick={onHide} disabled={loading}>
          {cancelLabel}
        </button>
        {variant === 'danger' ? (
          <button type="button" className="btn-danger rounded-lg px-4 py-2" onClick={onConfirm} disabled={loading}>
            {loading ? 'Working…' : confirmLabel}
          </button>
        ) : (
          <Button type="button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Working…' : confirmLabel}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
