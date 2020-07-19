import React, { memo, useEffect } from "react";

import { useDoubleTapHandler } from "../../hooks";

/**
 * Visual entry of application
 * @type {React.NamedExoticComponent<object>}
 */
const App = () => {
  const onTouchStart = useDoubleTapHandler();

  // Add handler which prevents scroll after double tapping the screen
  useEffect(() => {
    const body = document.documentElement;
    body.addEventListener("touchstart", onTouchStart, { passive: false });

    return () => body.removeEventListener("touchstart", onTouchStart);
  }, [onTouchStart]);

  return <div>marathon</div>;
};

export default React.memo(App);
