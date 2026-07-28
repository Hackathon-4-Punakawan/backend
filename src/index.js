const app = require("./app");

const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`API tester available at http://localhost:${port}/api-tester/`);
  });
}

module.exports = app;
