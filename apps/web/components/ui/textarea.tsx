interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = "", ...props }: TextareaProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <textarea className={`w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] resize-y ${className}`} {...props} />
    </div>
  );
}
