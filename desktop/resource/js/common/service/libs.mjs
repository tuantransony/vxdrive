
let env = window.pcdenv;

const libs = {
  uuid: 'https://jspm.dev/uuid',
  qrscanner: '/resources/js/qrscanner/qr-scanner.min.js',
  qrscanworker: '/resources/js/qrscanner/qr-scanner-worker.min.js',
};

export default {
  get: (name)=> {
    if (name === undefined) {
      return;
    }
    if (env && env.libs && env.libs[name]) {
      return env.libs[name];
    }
    return libs[name];
  }
}
