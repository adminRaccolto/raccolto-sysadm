export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <strong>Nada por aqui ainda.</strong>
      <p>{message}</p>
    </div>
  );
}
