import { useParams } from 'react-router-dom';
import DiagnosticoLeadPage from './DiagnosticoLeadPage';

export default function DiagnosticoLeadPublicoPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  if (!empresaId) return null;
  return <DiagnosticoLeadPage empresaId={empresaId} />;
}
