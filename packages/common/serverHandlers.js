function setupProcessHandlers(server) {
  const gracefulShutdown = async () => {
    try {
      console.log('shutting down...');
      globals.shutdown = true;
      await Util.sleep(1000);
  
      await database.connection.close();
      await server.close();
    } catch (error) {
      console.log('error shutting down gracefully: ', error);
    }
  };
  
  // ctrl+c exit
  process.on('SIGINT', async () => {
    console.log('ctrl c !');
    await gracefulShutdown();
    process.exit();
  });
  
  // nodemon restarts
  process.on('SIGHUP', async () => {
    console.log('sighup signal!!');
    await gracefulShutdown();
    process.exit();
  });
  
  // nodemon restarts
  process.on('SIGUSR2', async () => {
    console.log('SIGUSR2 signal!! (nodemon restart)');
    await gracefulShutdown();
    process.exit();
  });
  
  const unexpectedErrorHandler = (error) => {
    console.error('unexpectedErrorHandler:', error);
  };
  
  process.on('uncaughtException', err => {
    console.log('uncaughtException', err);
    unexpectedErrorHandler();
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
    unexpectedErrorHandler();
  });
  
  process.on('exit', (code) => {
    console.log(`Exiting with code: ${code}`);
  });
  
  process.on('multipleResolves', (type, promise, reason) => {
    console.error('multipleResolves', type, promise, reason);
  });
}