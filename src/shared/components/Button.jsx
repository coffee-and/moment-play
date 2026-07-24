import { forwardRef } from 'react';

function joinClassNames(values) {
  return values.filter(Boolean).join(' ');
}

export const Button = forwardRef(function Button({
  as: Component = 'button',
  children,
  className = '',
  fullWidth = false,
  size,
  type = 'button',
  variant = 'primary',
  ...props
}, ref) {
  // `type` only applies to a real <button>; non-button elements (e.g. router Link) don't accept it.
  const typeProp = Component === 'button' ? { type } : {};

  return (
    <Component
      ref={ref}
      {...typeProp}
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
    </Component>
  );
});
