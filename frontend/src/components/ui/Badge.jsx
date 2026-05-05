import React from "react";

export default function Badge({ className = "", children }) {
  return <span className={`ui-badge ${className}`.trim()}>{children}</span>;
}
