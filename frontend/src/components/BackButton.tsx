import { useNavigate } from 'react-router-dom';

type BackButtonProps = {
  fallbackPath?: string;
  label?: string;
};

export default function BackButton({ fallbackPath = '/dashboard', label = 'Voltar' }: BackButtonProps) {
  const navigate = useNavigate();

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath);
  }

  return (
    <button className="button button--ghost button--small" type="button" onClick={handleBack}>
      {label}
    </button>
  );
}
