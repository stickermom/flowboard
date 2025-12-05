const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export const formatINR = (amount: number) => {
  if (Number.isNaN(amount)) {
    return inrFormatter.format(0);
  }
  return inrFormatter.format(amount);
};
