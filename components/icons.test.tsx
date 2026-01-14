import { render, screen } from '@testing-library/react';
import { MicIcon } from './icons';

test('renders MicIcon', () => {
  render(<MicIcon />);
  const svgElement = screen.getByRole('img', { hidden: true });
  expect(svgElement).toBeInTheDocument();
});
