process.env.NODE_ENV = 'test';
for (const key of ['GITHUB_TOKEN','ADMIN_PASSWORD','SUPER_ADMIN_PASSWORD','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN']) delete process.env[key];
const {default:app} = await import('../../server.js');
const server = app.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));
process.on('message',message=>{if(message==='stop')server.close(()=>process.exit(0));});

process.on('disconnect', () => server.close(() => process.exit(0)));
