model Author {
  Person
  literary_biography string
}

model Book {
  title     string
  summary   string
}

relation {
  author Author
  books  Book[]
}
