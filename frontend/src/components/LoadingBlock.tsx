export default function LoadingBlock({ label = 'Carregando...' }: { label?: string }) {
  return <div className="loading-block">{label}</div>;
}
