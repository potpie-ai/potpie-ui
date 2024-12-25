describe("Custom Token Login", () => {
  let chatId = "chat";
  before(() => {
    cy.login("VD7HhTNweAWXSz0TLBnoUaxiv2m2").then((user) => {
        cy.wait(3000);
        cy.visit("/all-chats");
    });
  });
  it("logs in with a custom token", () => {
    cy.contains("chats")
  });
});
