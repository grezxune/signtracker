export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "pill" | "minimal";
}

export interface ConfidenceSelectProps {
  value: string;
  onChange: (value: string) => void;
}
