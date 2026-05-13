"use client";
import { useState } from "react";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <div className="h-8 w-8 rounded-full overflow-hidden">
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" onError={() => setImgError(true)} />
      </div>
    );
  }

  return (
    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${getColorFromName(name)}`}>
      {getInitials(name)}
    </div>
  );
}
