import {BeforeInsert, Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Team {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ unique: true })
  public name: string;

  @Column()
  public description: string;

  @Column()
  public idea: string;

  @Column({ unique: true })
  public token: string;

  @Column({ type: 'boolean', default: false })
  public valid: boolean;

  @OneToMany(() => User, (user: User) => user.team, { onDelete: 'SET NULL' })
  public members: User[];

  @Column({ type: 'bigint' })
  public createdAt: number;

  @BeforeInsert()
  public setCreatedAt() {
    this.createdAt = Date.now();
  }
}
