const WebSocket = require('ws');
const spawn = require('child_process').spawn;

const wss = new WebSocket.Server({ port: 8080 });

const maxCapacity = 3; // Replace N with the desired maximum number of connections
let activeConnections = 0;

wss.on('connection', (ws) => {
  if (activeConnections >= maxCapacity) {
    ws.send('Server is at capacity. Please try again later.');
    ws.close();
    return;
  }

  activeConnections++;
  console.log('WebSocket connected');

  const command = '../chat';
  const args = ['-m', '../ggml-alpaca-7b-native-q4.bin', '-t', '4', '-n', '3000', '--repeat_penalty', '1.1', '--repeat_last_n', '128', '--color', '--temp', '0.8', '-c', '2048'];

  // Start the child process and capture the output
  const child = spawn(command, args);

  // Remove non-printable characters from the output
  const cleanOutput = (output) => {
    return output.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  };
  
  child.stdout.on('data', (data) => {
    const cleanedData = cleanOutput(data.toString().trim());
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(cleanedData);
    }
  });
  
  child.stderr.on('data', (data) => {
    const cleanedData = cleanOutput(data.toString().trim());
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(cleanedData);
    }
  });

  child.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
  });

  // Receive input from the WebSocket and send it to the child process' stdin
  ws.on('message', (message) => {
    child.stdin.write(`${message}\n`);
  });

  // Handle the close event of the WebSocket connection
  ws.on('close', () => {
    console.log('WebSocket disconnected');
    child.stdin.end();
    child.kill();
    activeConnections--;
  });
});


