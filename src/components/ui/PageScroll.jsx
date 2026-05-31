import React, { forwardRef } from 'react';
import { footerAwareStyle } from './AppFooter.jsx';

const PageScroll = forwardRef(function PageScroll({
  children,
  className = '',
  footerAware = true,
  hideScrollbar = false,
  as: Component = 'section',
  style,
  ...props
}, ref) {
  const scrollbarClass = hideScrollbar ? '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : '';
  return (
    <Component
      ref={ref}
      className={`min-h-0 flex-1 overflow-auto ${scrollbarClass} ${className}`}
      style={footerAware ? footerAwareStyle(style, 'scroll') : style}
      {...props}
    >
      {children}
    </Component>
  );
});

export default PageScroll;
