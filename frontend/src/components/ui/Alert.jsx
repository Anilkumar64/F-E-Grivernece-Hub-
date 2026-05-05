import React from "react";

const toneMap = {
  info: "ui-alert-info",
  success: "ui-alert-success",
  danger: "ui-alert-danger",
};

export default function Alert({ tone = "info", className = "", children }) {
  const toneClass = toneMap[tone] || toneMap.info;
  return <div className={`${toneClass} ${className}`.trim()}>{children}</div>;
}
