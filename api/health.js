module.exports = async function handler(req, res) {
  res.status(200).json({
    ok: true,
    app: "Vidora",
    version: "1.4.1",
    runtime: process.version
  });
};
