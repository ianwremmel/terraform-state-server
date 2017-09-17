import bunyan from 'bunyan';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';

import pkg from '../package';

import stateRouter from './state-router';

const app = express();
export default app;

const logger = bunyan.createLogger({
  name: pkg.name,
  serializers: bunyan.stdSerializers
});

app.use(morgan(`dev`));
app.use(compression());

app.use((req, res, next) => {
  req.logger = res.logger = logger.child({
    req,
    res
  });

  next();
});

app.get(`/ping`, (req, res) => {
  res.send({pong: true});
});

app.use(`/state`, stateRouter);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  const server = app.listen(PORT, () => {
    const {host, port} = server.address();

    logger.info(`server listening at http://${host}:${port}`);
  });
}
