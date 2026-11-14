import {Card, Space, Statistic, Typography} from 'antd';
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function StatisticPage() {
    const study = useQuery({
        queryKey: ['study'],
        queryFn: api.study,
        staleTime: 0,
    });
    const state = study.data;

    if (!state) {
        return <Card>请先开始当前背诵</Card>
    }
    const alreadyAnswered = state.correctCount + state.wrongCount;
    const firstRightPersent = Math.round((state.correctCount / alreadyAnswered) * 100)

    return (
        <Space orientation='vertical' size={20} className='full-width'>
            <Typography.Title level={2}>
                本轮学习统计
            </Typography.Title>
            <Card>
                <Space size='large' wrap>
                    <Statistic title="本轮得分" value={state.score}/>
                    <Statistic title="首次答对数" value={state.correctCount}/>
                    <Statistic title="错词数" value={state.wrongCount}/>
                    <Statistic title="首次正确率" value={firstRightPersent}/>
                </Space>
                
            </Card>
        </Space>
    )

}