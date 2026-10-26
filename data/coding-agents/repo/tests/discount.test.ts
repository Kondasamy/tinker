// Larkspur's checks on the bulk discount: each takes the discount code and says whether it holds.
type Discount = {
  bulkDiscount: (qty: number, unitPrice: number) => number;
  lineTotal: (qty: number, unitPrice: number) => number;
};

export const TESTS = [
  { id: 'at-50', name: '50 of one item get 10% off', check: (m: Discount) => m.bulkDiscount(50, 4) === 20 },
  { id: 'under-50', name: '49 get no discount', check: (m: Discount) => m.bulkDiscount(49, 4) === 0 },
  { id: 'cents', name: 'The discount is to the cent', check: (m: Discount) => m.bulkDiscount(64, 1.15) === 7.36 },
  { id: 'line', name: 'A line is its price less its discount', check: (m: Discount) => m.lineTotal(3, 2.25) === 6.75 },
];
