import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import pg from "pg";
import bcrypt from "bcrypt";
const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new pg.Pool({
    user: "postgres",
    host: "localhost",
    database: "finance",
    password: "basketball3",
    port: "5432"
});

app.use(express.static(__dirname + "/public"));
app.set("views", "./views");
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
app.get("/", async (req, res) => {
    res.render("index.ejs");
});
app.get("/signup", (req, res) => {
    res.render("signup.ejs");
});
app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send("Username and password required");
    }
    try {
        const user_check_query = "SELECT * FROM users WHERE username = $1";
        const user_check_result = await pool.query(user_check_query, [username]);
        if (user_check_result.rows.length > 0) {
            return res.status(400).send("Username already exists. Go back and try a new one");
        }
        const hash_pw = await bcrypt.hash(password, 10);
        await pool.query ("INSERT INTO users (username, password) VALUES ($1, $2)", [username, hash_pw]);
        res.redirect("/signin");
    }
    catch (err) {
        console.error(err)
        }
    });
app.get("/signin", async (req, res) => {
    res.render("signin.ejs")
});
app.post("/signin", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send("Username and password required");
    }
    try {
        const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (result.rows.length === 0) {
            return res.status(400).send("Invalid username or password");
        }
        const user = result.rows[0];
        const match_pw = await bcrypt.compare(password, user.password);
        if (!match_pw) {
            return res.status(400).send("Invalid username or password")
        }
        res.redirect(`/home/${user.user_id}`);
        } catch (err) {
            return res.status(400).send("Error during sign-in");
        }
});
app.get("/home/:user_id", async (req, res) => {
    const userId = req.params.user_id;
    try {
        // Fetch whatever data will be on homepage (name, accounts, transactions, etc)
        const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [userId]);
        if (result.rows.length === 0) {
            return res.status(404).send("User not found.");
        }
        const user = result.rows[0];
        res.render("home.ejs", { user: user });
    } catch (err) {
        console.error(err);
    }
});
app.get("/balance/:user_id", async (req, res) => {
    const { user_id } = req.params;
    try {
        const result = await pool.query("SELECT balance, account_number FROM accounts WHERE user_id = $1", [user_id]);
        if (result.rows.length === 0) {
            return res.status(404).send("Account not found for this user");
        }
        const account = result.rows[0];
        res.render("account_balance", { balance: account.balance, accountNumber: account.account_number });
    } catch (err) {
        console.error("Error retrieving balance:", err);
    }
});
app.get("/transactions/:user_id", async (req, res) => {
    const userId = req.params.user_id;
    try {
        const result = await pool.query(
            "SELECT * FROM transactions WHERE user_id = $1 ORDER BY transaction_date DESC", 
            [userId]
        );
        if (result.rows.length === 0) {
            return res.render("transactions.ejs", { message: "No transactions found." });
        }
        res.render("transactions.ejs", { transactions: result.rows });
    } catch (err) {
        console.error("Error retrieving transactions:", err);
        res.status(500).send("Internal server error");
    }
});

