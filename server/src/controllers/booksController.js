import * as booksModule from "../modules/booksModule.js";

export const getAllBooks = async (req, reply) => {
  try {
    const books = await booksModule.getAllBooks();
    reply.send(books);
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
};

export const getBookById = async (req, reply) => {
  try {
    const { id } = req.params;
    const book = await booksModule.getBookById(id);
    if (!book) return reply.code(404).send({ error: "Book not found" });
    reply.send(book);
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
};

export const createBook = async (req, reply) => {
  try {
    const book = await booksModule.createBook(req.body);
    reply.code(201).send(book);
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
};

export const updateBook = async (req, reply) => {
  try {
    const { id } = req.params;
    const book = await booksModule.updateBook(id, req.body);
    if (!book) return reply.code(404).send({ error: "Book not found" });
    reply.send(book);
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
};

export const deleteBook = async (req, reply) => {
  try {
    const { id } = req.params;
    const deleted = await booksModule.deleteBook(id);
    if (!deleted) return reply.code(404).send({ error: "Book not found" });
    reply.send({ message: "Book deleted" });
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
};
