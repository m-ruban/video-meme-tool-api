import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class Complaint1743888546222 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'complaints',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'reason',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'varchar',
          },
          {
            name: 'reviewed',
            type: 'boolean',
          },
          {
            name: 'email',
            type: 'varchar',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'meme_id',
            type: 'integer',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['meme_id'],
            referencedTableName: 'memes',
            referencedColumnNames: ['id'],
          }),
        ],
      }),
      true,
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('complaints');
  }
}
