import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// הגדרת מודל ספרים
export const Book = sequelize.define("Book", {
  title: { type: DataTypes.STRING, allowNull: false },
  author: { type: DataTypes.STRING, allowNull: false },
  fileUrl: { type: DataTypes.STRING }, // קובץ PDF או לינק
  available: { type: DataTypes.BOOLEAN, defaultValue: true },
});

// פונקציות עסקיות
export const getAllBooks = async () => {
  return await Book.findAll();
};

export const getBookById = async (id) => {
  return await Book.findByPk(id);
};

export const createBook = async (data) => {
  return await Book.create(data);
};

export const updateBook = async (id, data) => {
  const book = await Book.findByPk(id);
  if (!book) return null;
  return await book.update(data);
};

export const deleteBook = async (id) => {
  const book = await Book.findByPk(id);
  if (!book) return false;
  await book.destroy();
  return true;
};
