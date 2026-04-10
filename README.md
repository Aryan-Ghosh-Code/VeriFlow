<div align="center">

# 🔐 VeriFlow  
### *Decentralized Collateral-Based Resource Lending Protocol*  

🚀 A Web3-powered platform for **trustless peer-to-peer rentals**, leveraging **blockchain-secured collateral, smart contract escrow, and dynamic trust scoring**.  

<img width="200" height="200" alt="logo" src="https://github.com/user-attachments/assets/950d00c3-f494-40f8-857b-d63d8d28c3e1" />

</div>

---

## 📖 Overview  

**VeriFlow** is a decentralized platform that enables users to **borrow and lend real-world assets securely** without relying on trust.  

By integrating **smart contract escrow**, **on-chain reputation**, and **dynamic collateral mechanisms**, it ensures **fraud-proof, transparent, and instant rental transactions**—eliminating inefficiencies of traditional rental platforms.

---

## 🏗️ System Architecture  

```mermaid
graph TD
    A[👤 User: Borrower / Owner] --> B[🖥️ Next.js Frontend]
    B --> C[🦊 MetaMask Wallet]
    C --> D[🔗 Ethers.js]
    D --> E[📜 Smart Contract – Escrow]
    B --> F[(📡 Node.js Backend)]
    F --> G[(🍃 MongoDB Atlas)]
    E --> H[⛓️ Ethereum / Polygon Network]
    E --> I[📊 Trust Score Engine]
    I --> B
