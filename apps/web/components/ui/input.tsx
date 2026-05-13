interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", ...props }: InputProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <input className={`w-full border rounded-lg px-3 py-2 text-sm ${className}`} {...props} />
    </div>
  );
}
