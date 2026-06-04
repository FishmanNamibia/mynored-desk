const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')

// First, install the required dependencies
console.log('Installing ExcelJS package...')
exec('npm install --save exceljs', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error installing ExcelJS: ${error.message}`)
    return
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`)
    return
  }
  console.log(`stdout: ${stdout}`)
  console.log('ExcelJS installed successfully!')
  
  // Run the SQL migration script
  console.log('Running SQL migration for risk management tables...')
  const sqlFilePath = path.join(__dirname, 'create_risk_tables.sql')
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8')
  
  const { Client } = require('pg')
  const client = new Client()
  
  client.connect()
    .then(() => {
      console.log('Connected to database')
      return client.query(sqlContent)
    })
    .then(res => {
      console.log('SQL migration executed successfully!')
      console.log('Risk management tables created')
    })
    .catch(err => {
      console.error('Error executing SQL migration:', err)
    })
    .finally(() => {
      client.end()
    })
})
