"use client";

import React, { ReactNode } from "react";

interface ButtonProps {
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  type ?: "button" | "submit" | "reset";
  onClick?: (e: React.FormEvent) => Promise<void>;
}

export const Button = ({disabled,children, className}: ButtonProps) => {
  return (
    <button
      className={className}
      disabled={disabled}
    >
      {children}
    </button>
  );
};


interface TransferButtonProps {
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  type ?: "button" | "submit" | "reset";
  onClick?: () => void;
}


export const TransferButton = ({disabled,children, className}: TransferButtonProps) => {
  return (
    <button
      className={className}
      disabled={disabled}
    >
      {children}
    </button>
  );
};