import { render, screen } from '@testing-library/react';
import App from './App';

test('renders blockchain voting system', () => {
  render(<App />);
  const linkElement = screen.getByText(/blockchain voting system/i);
  expect(linkElement).toBeInTheDocument();
});