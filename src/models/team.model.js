
/**
 * Return the team model
 * @param {sequelize.Sequelize} sequelize
 * @param {sequelize.DataTypes} DataTypes
 * @returns {sequelize.Model} team_model
 */
module.exports = (sequelize, DataTypes) => {

    return sequelize.define('team', {
        // Attributes definition

        name: {
            type: DataTypes.STRING(35),
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true,
                len: [3, 35]
            }
        }
    });
};
