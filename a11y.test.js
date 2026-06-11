/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');
const { axe, toHaveNoViolations } = require('jest-axe');

expect.extend(toHaveNoViolations);

describe('Accessibility (a11y) Checks', () => {
  test('index.html should have no major accessibility violations', async () => {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // We parse the HTML into a DOM element
    document.body.innerHTML = html;
    
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });
});
