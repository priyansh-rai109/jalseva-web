const fetch = require('node-fetch');
async function test() {
  const cookie = encodeURIComponent(JSON.stringify({
    id: '00000000-0000-0000-0000-009876543210',
    phone: '+919876543210',
    email: undefined,
    user_metadata: { role: 'customer', name: 'Vijay Jodhpur', phone: '+919876543210' }
  }));

  const res = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `jalseva-mock-session=${cookie}`
    },
    body: JSON.stringify({
      items: [
        {
          product: { id: '00000000-0000-0000-0000-000000000001', price: 100, supplier_id: '00000000-0000-0000-0000-000000000002', name: 'Test Can', type: 'can', unit: 'piece' },
          quantity: 2
        }
      ],
      deliveryAddress: { line1: 'Test', pincode: '342001', city: 'Jodhpur' },
      paymentMode: 'cash_on_delivery',
      specialInstructions: ''
    })
  });
  
  const json = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', json);
}
test();
