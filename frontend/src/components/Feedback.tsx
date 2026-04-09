interface FeedbackProps {
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function Feedback({ type, message }: FeedbackProps) {
  return <div className={`feedback feedback--${type}`}>{message}</div>;
}
