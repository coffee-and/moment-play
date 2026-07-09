import { forwardRef } from 'react';

function joinClassNames(values) {
  return values.filter(Boolean).join(' ');
}

export const Button = forwardRef(function Button({
  children,
  className = '',
  fullWidth = false,
  size,
  type = 'button',
  variant = 'primary',
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={joinClassNames([
        'button',
        `button--${variant}`,
        size ? `button--${size}` : '',
        fullWidth ? 'button--full' : '',
        className,
      ])}
      {...props}
    >
      {children}
    </button>
  );
});
