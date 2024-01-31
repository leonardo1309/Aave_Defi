const { getWeth, AMOUNT } = require("./getWeth")
const { getNamedAccounts, ethers } = require("hardhat")


async function main() {
    await getWeth()
    const [deployer] = await ethers.getSigners()
    console.log(`Deployer: ${deployer.address}`)
    const pool = await getsPool(deployer)
    console.log(`Pool Address: ${pool.target}`)
    const poolAddress = pool.target
    //deposit
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    //aprove
    await approveERC20(wethTokenAddress, poolAddress, AMOUNT, deployer)
    console.log("Depositing.....")
    await pool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Deposited...")
    let {availableBorrowsBase, totalDebtBase} = await getBorrowUserData(pool, deployer)
    const daiPrice = await getDaiPrice()
    const daiToBorrow = availableBorrowsBase.toString() * 0.95 * (1 / daiPrice.toString())
    console.log(`You can Borrow ${daiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.parseEther(daiToBorrow.toFixed(18))
    console.log(`You can Borrow ${amountDaiToBorrowWei} DAI`)
    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    await borrowDai(daiTokenAddress, pool, amountDaiToBorrowWei, deployer)
    await getBorrowUserData(pool, deployer)
    
    await repay(amountDaiToBorrowWei, daiTokenAddress, pool, deployer)
    await getBorrowUserData(pool, deployer)

}

async function repay(amount, daiAddress, pool, account) {
    await approveERC20(daiAddress, pool.target, amount, account)
    const repayTx = await pool.repay(daiAddress, amount, 2, account)
    await repayTx.wait(1)
    console.log("Repaid!")
}

async function borrowDai(daiAddress, pool, amountDaiToBorrowWei, account) {
    const borrowTx = await pool.borrow(daiAddress, amountDaiToBorrowWei, 2, 0, account)
    await borrowTx.wait(1)
    console.log("You've borrowed!!")

}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt("AggregatorV3Interface", "0x773616E4d11A78F511299002da57A0a94577F1f4")
    const price = (await daiEthPriceFeed.latestRoundData()) [1]
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price
}

async function getBorrowUserData(pool, account) {
    const { totalCollateralBase, totalDebtBase, availableBorrowsBase } = await pool.getUserAccountData(account)
    console.log(`You have ${totalCollateralBase} ETH deposited`)
    console.log(`You have ${totalDebtBase} worth of ETH debt`)
    console.log(`You can borrow ${availableBorrowsBase} worth of ETH`)
    return { availableBorrowsBase, totalDebtBase }
}

async function getsPool(account) {
        const poolAddressProvider = await ethers.getContractAt("IPoolAddressesProvider" , "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e", account)
        const poolAddress = await poolAddressProvider.getPool()
        const pool = await ethers.getContractAt("IPool", poolAddress, account)
        return pool
}

async function approveERC20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Approved!!")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

    