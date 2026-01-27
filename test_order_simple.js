const axios = require('axios');

async function testOrder() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      pin: '1234'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token:', token.substring(0, 50) + '...');
    
    // Create order
    const orderData = {
      table_id: 15,
      covers: 2,
      items: [{
        product_id: 1,
        quantity: 1,
        unit_price: 5.00,
        category_code: 'gelati'
      }],
      notes: 'test ordine'
    };
    
    console.log('🔍 Creating order with data:', JSON.stringify(orderData, null, 2));
    
    const orderResponse = await axios.post('http://localhost:3000/api/orders', orderData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Order created successfully:', orderResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testOrder();
