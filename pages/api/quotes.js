const { fields, files } = await new Promise((resolve, reject) => {
  form.parse(req, (err, fields, files) => {
    if (err) reject(err);
    else resolve({ fields, files });
  });
});

const items = rows
  .filter(r => r['Quotation'])
  .map(r => ({
    part: r['Parts number'] || '',
    desc: r['Description'] || '',
    qtyTier: r["Q'ty"] || '',
    price:
      typeof r['Quotation'] === 'string'
        ? r['Quotation']
        : Number(r['Quotation']).toFixed(2),
  }));
