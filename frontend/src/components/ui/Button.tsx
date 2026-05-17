import { forwardRef, type ButtonHTMLAttributes } from 'react';

const variantClass = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  outline: 'btn-outline',
} as const;

export type ButtonVariant = keyof typeof variantClass;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`${variantClass[variant]} ${className}`.trim()}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
