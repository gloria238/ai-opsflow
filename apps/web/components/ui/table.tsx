export function Table({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border overflow-hidden ${className}`}>
      <table className="w-full">{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="bg-gray-50 border-b">{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, className = "", onClick }: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr className={`border-b last:border-b-0 hover:bg-gray-50 ${className}`} onClick={onClick}>
      {children}
    </tr>
  );
}

interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  className?: string;
}

export function TableHead({ children, className = "", ...props }: ThProps) {
  return <th className={`text-left px-4 py-3 text-sm font-medium text-gray-600 ${className}`} {...props}>{children}</th>;
}

interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  className?: string;
}

export function TableCell({ children, className = "", ...props }: TdProps) {
  return <td className={`px-4 py-3 text-sm ${className}`} {...props}>{children}</td>;
}
