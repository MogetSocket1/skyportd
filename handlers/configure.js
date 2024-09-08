const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { program } = require('commander');

// Parse command-line arguments
program
  .option('--panel <url>', 'URL of the panel')
  .option('--key <key>', 'Configure key')
  .parse(process.argv);

const options = program.opts();

if (!options.panel || !options.key) {
  console.error('Error: Both --panel and --key options are required.');
  process.exit(1);
}

// Function to generate a random access key
function generateAccessKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Function to update the config file
function updateConfig(configPath, newConfig) {
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
}

// Function to make HTTP request using axios
function makeHttpRequest(url, method, data) {
  return axios({
    method,
    url,
    data,
  })
    .then((response) => response.data)
    .catch((error) => {
      if (error.response) {
        throw new Error(`HTTP request failed with status ${error.response.status}: ${error.response.data}`);
      } else {
        throw new Error(`Error making request: ${error.message}`);
      }
    });
}

// Main configuration function
async function configureNode() {
  const configPath = path.join(__dirname, '../config.json');
  let config;

  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('Error reading config file:', error);
    process.exit(1);
  }

  // Generate a new access key
  const newAccessKey = generateAccessKey();

  // Prepare the configuration request URL
  const configureUrl = new URL('/nodes/configure', options.panel);
  configureUrl.searchParams.append('authKey', config.key); // Use existing key as authKey
  configureUrl.searchParams.append('configureKey', options.key);
  configureUrl.searchParams.append('accessKey', newAccessKey);

  try {
    // Send configuration request to the panel
    await makeHttpRequest(configureUrl.toString(), 'POST');

    // Update local config
    config.remote = options.panel;
    config.key = newAccessKey;

    // Save updated config
    updateConfig(configPath, config);

    console.log('Node configured successfully!');
    console.log('New configuration:');
    console.log(JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error configuring node:', error);
    process.exit(1);
  }
}

// Run the configuration
configureNode();
