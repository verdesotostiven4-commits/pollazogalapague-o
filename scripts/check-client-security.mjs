import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const forbidden = [
  { label: 'hardcoded admin PIN', pattern: /\b1328\b/ },
  { label: 'hardcoded delivery PIN', pattern: /\b2580\b/ },
  {
    label: 'client panel auth flag',
    pattern: /(?:getItem|setItem)\(\s*['"]pollazo_(?:admin|delivery)_auth['"]/, 
  },
  {
    label: 'direct sensitive table access',
    pattern: /\.from\(\s*['"](?:customers|orders|customer_memberships|membership_payments|order_bonus_items|push_subscriptions|cash_registers|cash_transactions|pos_sales|pos_sale_items|pos_payment_splits|stock_movements|testimonials|app_metrics)['"]\s*\)/,
  },
  {
    label: 'direct sensitive RPC',
    pattern: /\.rpc\(\s*['"](?:increment_metric|open_cash_register_v1|close_cash_register_v1|create_pos_sale_v1|get_pos_report_v1|void_pos_sale_v1|adjust_product_stock_v1|get_product_stock_movements_v1|sync_online_order_stock_v1|transition_online_order_v2|submit_customer_testimonial_v1)['"]/, 
  },
];

const files = [];

const walk = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (allowedExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
};

walk(root);

const violations = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    forbidden.forEach(rule => {
      if (rule.pattern.test(line)) {
        violations.push({
          file: path.relative(process.cwd(), file),
          line: index + 1,
          label: rule.label,
          text: line.trim().slice(0, 220),
        });
      }
      rule.pattern.lastIndex = 0;
    });
  });
}

if (violations.length > 0) {
  console.error('Client security check failed:');
  violations.forEach(violation => {
    console.error(
      `- ${violation.file}:${violation.line} [${violation.label}] ${violation.text}`
    );
  });
  process.exit(1);
}

console.log(`Client security check passed (${files.length} source files scanned).`);
