import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { BrolayProvider } from '../contexts/BrolayContext';
import { UIProvider } from '../contexts/UIContext';
import { FilterProvider } from '../contexts/FilterContext';

/**
 * Custom render function that wraps components with necessary providers
 *
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} options.providerProps - Props to pass to BrolayProvider
 * @param {boolean} options.withRouter - Whether to wrap with BrowserRouter (default: true)
 * @param {boolean} options.withProviders - Whether to wrap with context providers (default: true)
 * @returns {Object} - Render result from @testing-library/react
 */
export function renderWithProviders(
  ui,
  {
    providerProps = {},
    withRouter = true,
    withProviders = true,
    ...renderOptions
  } = {}
) {
  let Wrapper = ({ children }) => <>{children}</>;

  if (withProviders) {
    Wrapper = ({ children }) => (
      <UIProvider>
        <FilterProvider>
          <BrolayProvider {...providerProps}>
            {children}
          </BrolayProvider>
        </FilterProvider>
      </UIProvider>
    );
  }

  if (withRouter) {
    const InnerWrapper = Wrapper;
    Wrapper = ({ children }) => (
      <BrowserRouter>
        <InnerWrapper>{children}</InnerWrapper>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Custom render for components that only need routing (no context providers)
 */
export function renderWithRouter(ui, renderOptions = {}) {
  return renderWithProviders(ui, {
    ...renderOptions,
    withProviders: false,
    withRouter: true,
  });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
