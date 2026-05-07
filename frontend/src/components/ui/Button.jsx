import React from "react";

const variants = {
  primary: "ui-btn-primary",
  outline: "ui-btn-outline",
  ghost: "ui-btn-ghost",
};

export default function Button({
  as: As = "button",
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  const variantClass = variants[variant] || variants.primary;
  const Comp = As;
  return React.createElement(
    Comp,
    { className: `${variantClass} ${className}`.trim(), ...props },
    children
  );
}
